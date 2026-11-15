import WithdrawalLink from "@/components/WithdrawalLink";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <WithdrawalLink />
    </>
  );
}
