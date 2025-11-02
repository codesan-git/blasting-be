import backupService from "../src/services/backup.service";

const result = backupService.backupCompressed();
console.log(result);
process.exit(result.success ? 0 : 1);
