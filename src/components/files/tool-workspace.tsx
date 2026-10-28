import type { ReactNode } from "react";

interface ToolWorkspaceProps {
  /** The files being worked on. */
  children: ReactNode;
  /** Sidebar heading, e.g. "PDF settings". */
  settingsTitle: string;
  settings?: ReactNode;
  /** The TaskPanel: pinned to the bottom of the screen on mobile, inline in the sidebar on desktop. */
  action: ReactNode;
  mainLabel: string;
}

/** Two-column tool layout used once files are added: content on the left, settings + action on the right. */
export function ToolWorkspace({ children, settingsTitle, settings, action, mainLabel }: ToolWorkspaceProps) {
  return (
    <div className="grid gap-6 pb-40 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:pb-0">
      <section aria-label={mainLabel} className="min-w-0 space-y-4">
        {children}
      </section>

      <aside className="space-y-5 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24">
        <h2 className="text-base font-semibold">{settingsTitle}</h2>
        {settings}
        <div className="z-20 max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:border-t max-lg:border-border max-lg:bg-surface/95 max-lg:p-4 max-lg:backdrop-blur lg:border-t lg:border-border lg:pt-5">
          {action}
        </div>
      </aside>
    </div>
  );
}
