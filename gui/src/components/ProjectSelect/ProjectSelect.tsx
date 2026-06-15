import { Listbox } from "@headlessui/react";
import {
  ChevronDownIcon,
  Cog6ToothIcon,
  CubeIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useContext, useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { defaultBorderRadius, lightGray, vscDropdownBackground } from "..";
import { IdeMessengerContext } from "../../context/IdeMessenger";
import { useAppSelector } from "../../redux/hooks";
import {
  selectDefaultProjectId,
  selectSelectedLlmKey,
  setDefaultProjectId,
  setLlmsLoading,
  setProjectContext,
  setProjectContextError,
  setProjectContextLoading,
  setProjectLlms,
  setSelectedLlmKey,
} from "../../redux/slices/configSlice";
import { getFontSize, isMetaEquivalentKeyPressed } from "../../util";

interface ProjectOptionProps {
  option: Option;
  idx: number;
}

interface Option {
  value: number;
  title: string;
  apiKey?: string;
}

const MAX_HEIGHT_PX = 300;

const StyledListboxButton = styled(Listbox.Button)`
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 2px;
  border: none;
  cursor: pointer;
  font-size: ${getFontSize() - 2}px;
  background: transparent;
  color: ${lightGray};
  &:focus {
    outline: none;
  }
`;

const StyledListboxOptions = styled(Listbox.Options)<{ $showabove: boolean }>`
  margin-top: 4px;
  position: absolute;
  list-style: none;
  padding: 0px;
  white-space: nowrap;
  cursor: default;

  display: flex;
  flex-direction: column;

  border-radius: ${defaultBorderRadius};
  border: 0.5px solid ${lightGray};
  background-color: ${vscDropdownBackground};

  max-height: ${MAX_HEIGHT_PX}px;
  overflow-y: scroll;

  scrollbar-width: none;

  ${(props) => (props.$showabove ? "bottom: 100%;" : "top: 100%;")}
`;

const StyledListboxOption = styled(Listbox.Option)<{ isDisabled?: boolean }>`
  border-radius: ${defaultBorderRadius};
  padding: 6px 12px;

  ${({ isDisabled }) =>
    !isDisabled &&
    `
    cursor: pointer;

    &:hover {
      background: ${lightGray}33;
    }
  `}

  ${({ isDisabled }) =>
    isDisabled &&
    `
    opacity: 0.5;
  `}
`;

const IconBase = styled.div<{ $hovered: boolean }>`
  width: 1.2em;
  height: 1.2em;
  cursor: pointer;
  padding: 4px;
  border-radius: ${defaultBorderRadius};
  opacity: ${(props) => (props.$hovered ? 0.75 : 0)};
  visibility: ${(props) => (props.$hovered ? "visible" : "hidden")};

  &:hover {
    opacity: 1;
    background-color: ${lightGray}33;
  }
`;

const StyledTrashIcon = styled(IconBase).attrs({ as: TrashIcon })``;
const StyledCog6ToothIcon = styled(IconBase).attrs({ as: Cog6ToothIcon })``;

function projectSelectTitle(
  projectId: any,
  options: any[],
): string | undefined {
  if (projectId && options) {
    return options?.find((o) => o.value === projectId)?.title;
  }
}

function ProjectOption({ option, idx }: ProjectOptionProps) {
  const ideMessenger = useContext(IdeMessengerContext);

  const dispatch = useDispatch();
  const [hovered, setHovered] = useState(false);

  function onClickGear(e: any) {
    e.stopPropagation();
    e.preventDefault();

    ideMessenger.post("config/openProfile", {
      profileId: "local",
    });
  }

  function handleOptionClick(e: any) {}

  return (
    <StyledListboxOption
      key={idx}
      value={option.value}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleOptionClick}
    >
      <div className="flex w-full flex-col gap-0.5">
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-grow items-center">
            <CubeIcon className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="flex-grow">{option.title}</span>
          </div>
          <div className="ml-5 flex items-center">
            <StyledCog6ToothIcon $hovered={hovered} onClick={onClickGear} />
          </div>
        </div>
      </div>
    </StyledListboxOption>
  );
}

/**
 * Fetches project context from the backend and stores it in Redux
 * Currently uses dummy data while backend endpoint is being implemented
 *
 * @param projectId - The project ID to fetch context for
 * @param ideMessenger - The IDE messenger for making requests
 * @param dispatch - Redux dispatch function
 */
async function fetchProjectContext(
  projectId: number,
  ideMessenger: any,
  dispatch: any,
) {
  console.log("[ProjectSelect] fetchProjectContext called:", { projectId });
  dispatch(setProjectContextLoading(true));
  dispatch(setProjectContextError(null));

  try {
    const result = await ideMessenger.request("projects/context", {
      projectId,
    });

    console.log("[ProjectSelect] Received context result:", {
      status: result.status,
      hasData: !!result.content?.data,
      dataLength: result.content?.data?.length,
      dataPreview: result.content?.data?.[0]?.message?.substring(0, 100),
    });

    if (result.status !== "error" && result.content?.data) {
      dispatch(
        setProjectContext({
          projectId,
          context: result.content.data,
        }),
      );
      console.log("[ProjectSelect] Context stored in Redux:", {
        projectId,
        contextLength: result.content.data.length,
      });
    } else {
      throw new Error(
        result.content?.message || "Failed to fetch project context",
      );
    }
  } catch (error: any) {
    console.error("[ProjectSelect] Failed to fetch project context:", error);
    dispatch(
      setProjectContextError(error.message || "Failed to load project context"),
    );
  }
}

function ProjecSelect() {
  const dispatch = useDispatch();
  const ideMessenger = useContext(IdeMessengerContext);
  const [showAbove, setShowAbove] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const defaultProjectId = useAppSelector(selectDefaultProjectId);
  const selectedLlmKey = useAppSelector(selectSelectedLlmKey);
  const navigate = useNavigate();

  async function fetchLlmsForProject(projectId: number) {
    dispatch(setLlmsLoading(true));
    try {
      const result = await ideMessenger.request("projects/llmConfigurations", {
        projectId,
      });
      const llms =
        result.status !== "error" ? (result.content?.data ?? []) : [];
      if (llms.length > 0) {
        dispatch(setProjectLlms(llms));
        const llmStillExists = llms.some((l) => l.key === selectedLlmKey);
        if (!selectedLlmKey || !llmStillExists) {
          dispatch(setSelectedLlmKey(llms[0].key));
        }
      } else {
        dispatch(setProjectLlms([]));
        dispatch(setSelectedLlmKey(undefined));
      }
    } catch {
      dispatch(setProjectLlms([]));
      dispatch(setSelectedLlmKey(undefined));
    } finally {
      dispatch(setLlmsLoading(false));
    }
  }

  // Fetch user projects and initialize on mount
  useEffect(() => {
    const fetchUserProject = async () => {
      try {
        const result = await ideMessenger.request("projects/users", undefined);
        if (result.status != "error" && result.content) {
          const projectOptions = result?.content?.data?.map((con) => ({
            title: con.Label,
            value: con.Value,
          }));
          const initialProjectId = defaultProjectId ?? projectOptions[0].value;
          if (!defaultProjectId) {
            dispatch(setDefaultProjectId({ value: initialProjectId }));
          }
          setOptions(projectOptions);

          // Fetch both LLMs and context in parallel on initial load
          await Promise.all([
            fetchLlmsForProject(initialProjectId),
            fetchProjectContext(initialProjectId, ideMessenger, dispatch),
          ]);
        }
      } catch (err) {
        navigate("/login");
      }
    };

    fetchUserProject();
  }, []);

  useEffect(() => {
    const handleResize = () => calculatePosition();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "'" && isMetaEquivalentKeyPressed(event as any)) {
        const direction = event.shiftKey ? -1 : 1;
        const currentIndex = options.findIndex(
          (option) => option.value === defaultProjectId,
        );
        let nextIndex = (currentIndex + 1 * direction) % options.length;
        if (nextIndex < 0) nextIndex = options.length - 1;
        const newProjectId = options[nextIndex].value;
        dispatch(setDefaultProjectId({ value: newProjectId }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [options, defaultProjectId]);

  function calculatePosition() {
    if (!buttonRef.current) {
      return;
    }
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = MAX_HEIGHT_PX;

    setShowAbove(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
  }

  return (
    <Listbox
      onChange={async (val: string) => {
        const newProjectId = parseInt(val);
        if (newProjectId === defaultProjectId) return;
        dispatch(setDefaultProjectId({ value: newProjectId }));

        // Fetch both LLMs and context when project changes
        await Promise.all([
          fetchLlmsForProject(newProjectId),
          fetchProjectContext(newProjectId, ideMessenger, dispatch),
        ]);
      }}
    >
      <div className="relative">
        <StyledListboxButton
          data-testid="model-select-button"
          ref={buttonRef}
          className="h-[18px] overflow-hidden"
          style={{ padding: 0 }}
          onClick={calculatePosition}
        >
          <div className="flex max-w-[33vw] items-center gap-0.5 text-gray-400 transition-colors duration-200">
            <span className="truncate">
              {projectSelectTitle(defaultProjectId, options) ||
                "Select Project"}{" "}
            </span>
            <ChevronDownIcon
              className="h-3 w-3 flex-shrink-0"
              aria-hidden="true"
            />
          </div>
        </StyledListboxButton>
        <StyledListboxOptions
          $showabove={showAbove}
          className="z-50 max-w-[90vw]"
        >
          <div className={`max-h-[${MAX_HEIGHT_PX}px]`}>
            {options.map((option, idx) => (
              <ProjectOption option={option} idx={idx} key={idx} />
            ))}
          </div>
        </StyledListboxOptions>
      </div>
    </Listbox>
  );
}

export default ProjecSelect;
