import Agent from "@/components/Agent";
import { getCurrentUser } from "@/lib/actions/auth.action";

const Page = async () => {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-2xl font-bold">Interview Generation</h3>

      <Agent
        userName={user?.name || "Salony Ranjan"}
        userId={user?.id || ""} 
        type="generate"
      />
    </div>
  );
};

export default Page;