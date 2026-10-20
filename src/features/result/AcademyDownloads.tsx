import { academyUrl, type Job } from '../../shared/api'

// HML 작업의 학원 양식 문제지 내려받기 링크 (파일이 있는 작업에만)
export function AcademyDownloads({ jobId, files }: { jobId: string; files: Job['files'] }) {
  return <>
    {files.academyHwp && <a className="job-download-link" href={academyUrl(jobId, 'hwp')}>학원 양식 HWP</a>}
    {files.academyHwpx && <a className="job-download-link" href={academyUrl(jobId, 'hwpx')}>학원 양식 HWPX</a>}
  </>
}
