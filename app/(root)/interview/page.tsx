import CreateInterviewForm from "@/components/CreateInterviewForm";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

const Page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex flex-col gap-6">
      <CreateInterviewForm userId={user.id} />
    </div>
  );
};

export default Page;
