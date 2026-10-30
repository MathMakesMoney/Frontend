import { academyUrl, type Job } from '../../shared/api'

// 학원 작업의 결과 문서 내려받기 링크 (파일이 있는 작업에만)
export function AcademyDownloads({ jobId, files }: { jobId: string; files: Job['files'] }) {
  return <>
    {files.academyHwp && <a className="job-download-link" href={academyUrl(jobId, 'hwp')}>HWP</a>}
    {files.academyHwpx && <a className="job-download-link" href={academyUrl(jobId, 'hwpx')}>HWPX</a>}
  </>
}
