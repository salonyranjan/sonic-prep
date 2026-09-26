import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

const Page = async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <div className="flex flex-col gap-6">
      <Agent userName={user.name} userId={user.id} type="generate" />
    </div>
  );
};

export default Page;
