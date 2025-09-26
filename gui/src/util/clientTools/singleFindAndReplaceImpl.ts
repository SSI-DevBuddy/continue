import { resolveRelativePathInDir } from "core/util/ideUtils";
import { v4 as uuid } from "uuid";
import { applyForEditTool } from "../../redux/thunks/handleApplyStateUpdate";
import { ClientToolImpl } from "./callClientTool";
import {
  performFindAndReplace,
  validateSingleEdit,
} from "./findAndReplaceUtils";

export const singleFindAndReplaceImpl: ClientToolImpl = async (
  args,
  toolCallId,
  extras,
) => {
  const {
    filepath,
    old_string,
    new_string,
    replace_all = false,
    editingFileContents,
  } = args;
  const detectLineEndings = (content: string): 'crlf' | 'lf' => {
    return content.includes('\r\n') ? 'crlf' : 'lf';
  };

  const normalizeForMatching = (text: string): string => {
    return text.replace(/\r\n/g, '\n');
  };

  const restoreLineEndings = (text: string, format: 'crlf' | 'lf'): string => {
    if (format === 'crlf') {
      return text.replace(/\r/g, '').replace(/\n/g, '\r\n');
    }
    return text.replace(/\r\n/g, '\n');
  };

  const streamId = uuid();

  // Validate arguments
  if (!filepath) {
    throw new Error("filepath is required");
  }
  validateSingleEdit(old_string, new_string);

  // Resolve the file path
  const resolvedFilepath = await resolveRelativePathInDir(
    filepath,
    extras.ideMessenger.ide,
  );
  if (!resolvedFilepath) {
    throw new Error(`File ${filepath} does not exist`);
  }

  // Read the current file content
  const originalContent =
    editingFileContents ??
    (await extras.ideMessenger.ide.readFile(resolvedFilepath));
  
  const originalLineEndings = detectLineEndings(originalContent);
  const normalizedContent = normalizeForMatching(originalContent);
  const normalizedOldString = normalizeForMatching(old_string);
  const normalizedNewString = normalizeForMatching(new_string);
  // Perform the find and replace operation
  const tempResult = performFindAndReplace(
    normalizedContent,
    normalizedOldString,
    normalizedNewString,
    replace_all,
  );

  // 🔧 ADD: Restore line endings
  const newContent = restoreLineEndings(tempResult, originalLineEndings);

  // Apply the changes to the file
  void extras.dispatch(
    applyForEditTool({
      streamId,
      toolCallId,
      text: newContent,
      filepath: resolvedFilepath,
      isSearchAndReplace: true,
    }),
  );

  // Return success - applyToFile will handle the completion state
  return {
    respondImmediately: false, // Let apply state handle completion
    output: undefined,
  };
};
