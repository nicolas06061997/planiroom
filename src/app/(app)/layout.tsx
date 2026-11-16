import { Coquille } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <Coquille>{children}</Coquille>;
}
