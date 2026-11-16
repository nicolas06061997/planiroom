import { InstallationAuto } from "@/components/Installation";
import { Coquille } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Coquille>
      {children}
      <InstallationAuto />
    </Coquille>
  );
}
