import { ChevronDownIcon, CpuChipIcon } from "@heroicons/react/24/outline";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import {
  selectProjectLlms,
  selectSelectedLlmKey,
  setSelectedLlmKey,
} from "../../redux/slices/configSlice";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "../ui";

function LlmSelect() {
  const dispatch = useAppDispatch();
  const projectLlms = useAppSelector(selectProjectLlms);
  const selectedLlmKey = useAppSelector(selectSelectedLlmKey);
  const selectedLlm = projectLlms.find((l) => l.key === selectedLlmKey);
  const displayLabel = selectedLlm?.label ?? "Select LLM";

  return (
    <Listbox
      onChange={(val: string) => {
        if (val === selectedLlmKey) return;
        dispatch(setSelectedLlmKey(val));
      }}
    >
      <div className="relative flex">
        <ListboxButton
          data-testid="llm-select-button"
          className="text-description h-[18px] gap-1 border-none"
          disabled={projectLlms.length === 0}
        >
          <span className="line-clamp-1 break-all hover:brightness-110">
            {displayLabel}
          </span>
          <ChevronDownIcon
            className="hidden h-2 w-2 flex-shrink-0 hover:brightness-110 min-[200px]:flex"
            aria-hidden="true"
          />
        </ListboxButton>

        <ListboxOptions className="min-w-[160px]">
          <div className="flex items-center px-1.5 py-1">
            <span className="text-description text-xs font-medium">LLMs</span>
          </div>

          <div className="no-scrollbar max-h-[300px] overflow-y-auto">
            {projectLlms.length === 0 ? (
              <div className="text-description-muted px-2 py-4 text-center text-sm">
                No LLMs assigned to this project
              </div>
            ) : (
              projectLlms.map((llm, idx) => (
                <ListboxOption
                  key={llm.key}
                  value={llm.key}
                  className={`group ${llm.key === selectedLlmKey ? "bg-list-active text-list-active-foreground" : ""}`}
                >
                  <div className="flex items-center gap-2 py-0.5">
                    <CpuChipIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="line-clamp-1">{llm.label}</span>
                  </div>
                </ListboxOption>
              ))
            )}
          </div>
        </ListboxOptions>
      </div>
    </Listbox>
  );
}

export default LlmSelect;
