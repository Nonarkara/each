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
  onExport?: () => void;
  onSheets?: () => void;
  onImport?: () => void;
  onSheetsSetup?: () => void;
  onSyncIndicatorClick?: () => void;
  syncLabel?: string;
  syncStatus?: "local" | "loading" | "saving" | "saved" | "error";
  storageLabel?: string;
  tenantLabel?: string;
  vitals?: { cash: string; runway: string; runwayRisk?: boolean };
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
  onExport,
  onSheets,
  onImport,
  onSheetsSetup,
  onSyncIndicatorClick,
  syncLabel,
  syncStatus = "local",
  storageLabel,
  tenantLabel,
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
          ? "bg-ink-3"
          : "bg-ink-3";
  const indicatorInteractive = Boolean(onSyncIndicatorClick);
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-line-2 bg-paper">
        <div className="workspace-header mx-auto max-w-[1360px] px-4 py-2 lg:px-[22px]">
          <div className="workspace-identity flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-display text-[14px] font-bold text-ink">
                  EACH
                </p>
                <p className="text-[11px] text-ink-3">
                  {companyName || "Startup / SME"}
                  {tenantLabel ? ` · ${tenantLabel}` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="workspace-actions flex flex-wrap items-center gap-2">
            <LanguageSwitch />
            {onNavigate ? <QuickNavigation onNavigate={onNavigate} /> : null}
            {onIntake ? (
              <Btn onClick={onIntake}>{t("Add document", "เพิ่มเอกสาร")}</Btn>
            ) : null}
            <details className="relative">
              <summary
                className="inline-flex min-h-[44px] min-w-[44px] cursor-pointer list-none items-center justify-center border border-line bg-panel px-3"
                aria-label={t("Workspace tools", "เครื่องมือพื้นที่ทำงาน")}
                title={t("Workspace tools", "เครื่องมือพื้นที่ทำงาน")}
              >
                {t("Tools", "เครื่องมือ")}
              </summary>
              <div
                className="absolute right-0 top-full z-50 mt-px grid w-[min(340px,90vw)] grid-cols-2 gap-px border border-line-2 bg-line p-px"
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
                {onReset ? (
                  <Btn variant="ghost" onClick={onReset}>
                    {t("Reset", "ล้างข้อมูล")}
                  </Btn>
                ) : null}
              </div>
            </details>
          </div>

          <nav
            className="workspace-nav flex gap-1"
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
                    : "border-transparent text-ink-2 hover:border-line hover:bg-panel",
                ].join(" ")}
              >
                <span className="inline">{m.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1360px] px-4 py-5 sm:px-[22px] sm:py-[22px]">
        {vitals ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-3 mb-5">
            <div>
              <p className="text-[11px] text-ink-3">{t("Cash", "เงินสด")}</p>
              <p className="font-mono text-[14px] font-medium">{vitals.cash}</p>
            </div>
            <div>
              <p className="text-[11px] text-ink-3">
                {t("Runway", "ระยะเวลาที่เงินพอใช้")}
              </p>
              <p
                className={`font-mono text-[14px] font-medium ${vitals.runwayRisk ? "underline decoration-amber decoration-2 underline-offset-4" : ""}`}
              >
                {vitals.runway}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {indicatorInteractive ? (
                <button
                  type="button"
                  onClick={onSyncIndicatorClick}
                  className="inline-flex min-h-[44px] items-center gap-2 border border-transparent px-1 hover:border-line"
                  title={t("Open Sheet settings", "ตั้งค่าชีต")}
                >
                  <span
                    className={`inline-block h-2 w-2 ${dotClass}`}
                    aria-hidden
                  />
                  <span className="text-[11px] text-ink-3">
                    {syncLabel || "Local only"}
                  </span>
                </button>
              ) : (
                <>
                  <span
                    className={`inline-block h-2 w-2 ${dotClass}`}
                    aria-hidden
                  />
                  <span className="text-[11px] text-ink-3">
                    {syncLabel || "Local only"}
                  </span>
                </>
              )}
            </div>
            {storageLabel ? (
              <p className="text-[11px] text-ink-3">{storageLabel}</p>
            ) : null}
          </div>
        ) : null}

        {children}
      </main>
    </div>
  );
}
