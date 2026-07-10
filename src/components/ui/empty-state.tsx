interface EmptyStateProps {
  children: React.ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <p className="px-4 py-10 text-center text-[13px]" style={{ color: "var(--muted)" }}>
      {children}
    </p>
  );
}
