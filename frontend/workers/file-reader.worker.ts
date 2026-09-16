import { parseFile } from "../lib/engine/files";
import { createJob } from "../lib/services/storage";
import { errorMessage } from "../lib/errors";
self.onmessage = async (
  event: MessageEvent<{ file: File; header?: boolean }>,
) => {
  try {
    self.postMessage({
      job: await createJob(await parseFile(event.data.file, event.data.header)),
    });
  } catch (error) {
    self.postMessage({ error: errorMessage(error) });
  }
};
