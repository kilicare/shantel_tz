export function PageContainer(props: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-7xl px-6 py-6">{props.children}</div>;
}