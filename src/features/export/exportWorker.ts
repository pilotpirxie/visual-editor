import { runExportJob, type ExportJob, type ExportJobResult } from './exportJob';

type ExportWorkerScope = {
  addEventListener(type: 'message', listener: (event: MessageEvent<ExportJob>) => void): void;
  postMessage(message: ExportJobResult): void;
};

const workerScope: ExportWorkerScope = self;

workerScope.addEventListener('message', (event) => {
  void runExportJob(event.data).then((result) => workerScope.postMessage(result));
});
