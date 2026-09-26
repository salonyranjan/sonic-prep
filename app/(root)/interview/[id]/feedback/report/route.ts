import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getFeedbackByInterviewId,
  getInterviewById,
} from "@/lib/actions/general.action";
import { buildInterviewReport } from "@/lib/interview-report";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user)
    return new Response("Sign in to download your report.", { status: 401 });
  const interview = await getInterviewById(id);
  if (!interview) return new Response("Interview not found.", { status: 404 });
  const feedback = await getFeedbackByInterviewId({
    interviewId: id,
    userId: user.id,
  });
  if (!feedback)
    return new Response("Feedback is not available yet.", { status: 404 });
  const pdf = buildInterviewReport(interview, feedback, user.name);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="sonicprep-interview-report-${id}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
