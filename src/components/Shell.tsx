import { QuickNavigation } from "./QuickNavigation";
import { useLanguage } from "../lib/languageContext";
import { LanguageSwitch } from "../lib/language";
import type { ReactNode } from "react";
import { MODULES } from "../lib/types";
import { Btn } from "./ui/Axiom";

interface ShellProps {
  companyName?: string;
  activeModule?: string;
  onNavigate?: (id: string) => void;
  onReset?: () => void;
  onIntake?: () => void;
  onMirrors?: () => void;
  onSecurity?: () => void;
  onDossier?: () => void;
  onDesign?: () => void;
  onExport?: () => void;
  onSheets?: () => void;
  onImport?: () => void;
  onSheetsSetup?: () => void;
  onSyncIndicatorClick?: () => void;
  syncLabel?: string;
  syncStatus?: "local" | "loading" | "saving" | "saved" | "error";
  storageLabel?: string;
  tenantLabel?: string;
  accountEmail?: string;
  onSignOut?: () => void;
  vitals?: { cash?: string; runway?: string; runwayRisk?: boolean };
  children: ReactNode;
}

export function Shell({
  companyName,
  activeModule,
  onNavigate,
  onReset,
  onIntake,
  onMirrors,
  onSecurity,
  onDossier,
  onDesign,
  onExport,
  onSheets,
  onImport,
  onSheetsSetup,
  onSyncIndicatorClick,
  syncLabel,
  syncStatus = "local",
  storageLabel,
  tenantLabel,
  accountEmail,
  onSignOut,
  vitals,
  children,
}: ShellProps) {
  const { t } = useLanguage();
  const dotClass =
    syncStatus === "saved"
      ? "bg-amber"
      : syncStatus === "error"
        ? "bg-amber"
        : syncStatus === "saving" || syncStatus === "loading"
          ? "bg-ink-2"
          : "bg-ink-2";
  const indicatorInteractive = Boolean(onSyncIndicatorClick);
  /* Which dataset this is, where the data lives, and who is signed in: three
     facts about the state of the workspace, told together under the numbers
     they belong to. */
  const stateText = [tenantLabel, storageLabel, accountEmail].filter(Boolean).join(" · ");
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-rule bg-paper">
        <div className="workspace-header mx-auto max-w-[1360px] px-4 py-2 lg:px-[22px]">
          <div className="workspace-identity flex min-w-0 flex-col">
            {/* The masthead names two things and stops: the product, and the
                workspace it is running for. At 360px the column beside the
                actions is 94px wide — a third name in this block pushed the
                wordmark out of its own column and broke it mid-word. */}
            <p className="font-display text-[14px] font-bold text-ink">
              EACH
            </p>
            <p className="min-w-0 break-words text-[11px] text-ink-2">
              {companyName || "Startup / SME"}
            </p>
          </div>
          <div className="workspace-actions flex flex-wrap items-center gap-2">
            <span className="workspace-language">
              <LanguageSwitch />
            </span>
            {onNavigate ? <QuickNavigation onNavigate={onNavigate} /> : null}
            {onIntake ? (
              <Btn onClick={onIntake}>{t("Add document", "เพิ่มเอกสาร")}</Btn>
            ) : null}
            <details className="relative">
              <summary
                className="inline-flex min-h-[44px] min-w-[44px] w-11 cursor-pointer list-none items-center justify-center border border-hairline bg-panel px-0 sm:w-auto sm:px-3"
                aria-label={t("Workspace tools", "เครื่องมือพื้นที่ทำงาน")}
                title={t("Workspace tools", "เครื่องมือพื้นที่ทำงาน")}
              >
                {/* Below 640px the band has room for the mark, not for the
                    word: four squares say "tools" and cost 44px. */}
                <svg className="h-4 w-4 sm:hidden" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <rect x="0" y="0" width="6" height="6" />
                  <rect x="10" y="0" width="6" height="6" />
                  <rect x="0" y="10" width="6" height="6" />
                  <rect x="10" y="10" width="6" height="6" />
                </svg>
                <span className="hidden sm:inline">{t("Tools", "เครื่องมือ")}</span>
              </summary>
              <div
                className="absolute right-0 top-full z-50 mt-px grid w-[min(340px,90vw)] grid-cols-2 gap-px border border-rule bg-hairline p-px"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("button"))
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open");
                }}
              >
                {onMirrors ? (
                  <Btn variant="ghost" onClick={onMirrors}>
                    {t("Data mirrors", "สำเนาข้อมูล")}
                  </Btn>
                ) : null}
                {onSecurity ? (
                  <Btn variant="ghost" onClick={onSecurity}>
                    {t("Security Center", "ศูนย์ความปลอดภัย")}
                  </Btn>
                ) : null}
                {onExport ? (
                  <Btn variant="ghost" onClick={onExport}>
                    {t("Backup", "สำรองข้อมูล")}
                  </Btn>
                ) : null}
                {onSheets ? (
                  <Btn variant="ghost" onClick={onSheets}>
                    CSV
                  </Btn>
                ) : null}
                {onImport ? (
                  <Btn variant="ghost" onClick={onImport}>
                    {t("Restore", "กู้คืนข้อมูล")}
                  </Btn>
                ) : null}
                {onSheetsSetup ? (
                  <Btn variant="ghost" onClick={onSheetsSetup}>
                    Google Sheets
                  </Btn>
                ) : null}
                {onDossier ? (
                  <Btn variant="ghost" onClick={onDossier}>
                    {t("Dossier", "สรุปข้อมูล")}
                  </Btn>
                ) : null}
                {onDesign ? (
                  <Btn variant="ghost" onClick={onDesign}>
                    {t("Design system", "ระบบออกแบบ")}
                  </Btn>
                ) : null}
                {onReset ? (
                  <Btn variant="ghost" onClick={onReset}>
                    {t("Clear this device", "ล้างข้อมูลในเครื่อง")}
                  </Btn>
                ) : null}
                {onSignOut ? (
                  <Btn variant="ghost" onClick={onSignOut}>
                    {t("Sign out", "ออกจากระบบ")}
                  </Btn>
                ) : null}
              </div>
            </details>
          </div>

          <nav
            className="workspace-nav flex items-center gap-1"
            aria-label={t("Modules", "ส่วนงาน")}
          >
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onNavigate?.(m.id)}
                aria-current={activeModule === m.id ? "page" : undefined}
                className={[
                  "inline-flex min-h-[44px] min-w-[44px] items-center gap-2 border px-3 font-body text-[14px] font-semibold",
                  activeModule === m.id
                    ? "border-amber bg-panel text-ink"
                    : "border-transparent text-ink-2 hover:border-hairline hover:bg-panel",
                ].join(" ")}
              >
                <span className="inline">{m.label}</span>
              </button>
            ))}
            <span className="workspace-language ml-auto">
              <LanguageSwitch />
            </span>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-[22px] sm:py-[22px]">
        {vitals ? (
          /* Two kinds of fact, told on two lines. The first line is what the
             workspace holds — the cash, and on every surface but the money
             room, which owns the runway as its one bold move, how long that
             cash lasts. The second is where the workspace lives and who is
             signed in. They are different kinds of fact, so they are not
             forced onto one baseline that has to break somewhere. */
          <div className="mb-5 border-b border-hairline pb-2">
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              {vitals.cash ? (
                <span className="text-[11px] text-ink-2">
                  {t("Cash", "เงินสด")}
                  <span className="ml-2 font-mono text-[14px] text-ink">{vitals.cash}</span>
                </span>
              ) : null}
              {vitals.runway ? (
                <span className="text-[11px] text-ink-2">
                  {t("Runway", "ระยะเวลาที่เงินพอใช้")}
                  <span
                    className={`ml-2 font-mono text-[14px] text-ink ${vitals.runwayRisk ? "underline decoration-amber decoration-2 underline-offset-4" : ""}`}
                  >
                    {vitals.runway}
                  </span>
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {syncStatus !== "local" ? (
                indicatorInteractive ? (
                  <button
                    type="button"
                    onClick={onSyncIndicatorClick}
                    className="inline-flex min-h-[44px] items-center gap-2 border border-transparent px-1 hover:border-hairline"
                    title={t("Open Sheet settings", "ตั้งค่าชีต")}
                  >
                    <span className={`inline-block h-2 w-2 ${dotClass}`} aria-hidden />
                    <span className="text-[11px] text-ink-2">{syncLabel || "Local only"}</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 ${dotClass}`} aria-hidden />
                    <span className="text-[11px] text-ink-2">{syncLabel || "Local only"}</span>
                  </span>
                )
              ) : null}
              {stateText ? <span className="text-[11px] text-ink-2">{stateText}</span> : null}
            </div>
          </div>
        ) : null}

        {children}
      </main>
    </div>
  );
}
