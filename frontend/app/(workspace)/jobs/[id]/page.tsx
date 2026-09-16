import { JobDetails } from "@/components/job-details";
export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <JobDetails key={id} id={id} />;
}
