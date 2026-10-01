import { Activity, ClipboardList } from "lucide-react";
import { useL10n, useT } from "@/i18n";
import { useMonitor } from "@/store/monitor";
import { useView } from "@/features/monitor/useView";
import { AlertSlot } from "@/components/ui/AlertSlot";
import { fmtCountdown } from "@/lib/time";
import { Button } from "@/components/ui/Button";

/**
 * Binds the alert slot to the monitor view (§6.4). The visible slot is not a live region (its
 * elapsed time ticks every second); a separate assertive region announces only changes of
 * alert / abstention state (§11.2).
 */
export function AlertSlotView() {
  const t = useT();
  const l = useL10n();
  const alert = useView().alert;
  const acknowledge = useMonitor((s) => s.acknowledge);
  const setDialog = useMonitor((s) => s.setDialog);
  const openAssessment = () => setDialog("assessment", null);

  let slot;
  let announce = "";
  switch (alert.kind) {
    case "alert":
      announce = t.alertSlot.possiblePain;
      slot = (
        <AlertSlot
          variant="alert"
          title={t.alertSlot.possiblePain}
          detail={t.alertSlot.ruleSince(
            l(alert.rule),
            alert.since,
            alert.elapsed,
          )}
          right={
            <>
              <Button
                variant="onAlert"
                size="none"
                className="h-10 px-5 text-md"
                onClick={acknowledge}
              >
                {t.alertSlot.acknowledge}
              </Button>
              <Button
                variant="onAlertSolid"
                size="none"
                className="h-10 px-5 text-md"
                onClick={openAssessment}
              >
                {t.alertSlot.assess}
              </Button>
            </>
          }
        />
      );
      break;
    case "calibrating":
      slot = (
        <AlertSlot
          variant="info"
          title={t.entry.calibration.strip}
          right={
            <span className="nowrap text-md font-medium">
              {t.alertSlot.remaining(fmtCountdown(alert.remainingS))}
            </span>
          }
        />
      );
      break;
    case "acknowledged":
      slot = (
        <AlertSlot
          variant="acknowledged"
          title={t.alertSlot.acknowledgedBy(alert.by, alert.at)}
        />
      );
      break;
    case "advisory":
      if (alert.advisory === "NMB") {
        announce = t.alertSlot.nmb;
        slot = (
          <AlertSlot
            variant="advisory"
            title={t.alertSlot.nmb}
            right={
              <span className="nowrap flex items-center gap-2 text-md font-medium">
                <Activity aria-hidden size={18} strokeWidth={1.75} />
                {t.alertSlot.autonomicOnly}
              </span>
            }
          />
        );
      } else if (alert.advisory === "WASHOUT") {
        slot = (
          <AlertSlot
            variant="advisory"
            title={t.entry.washout(fmtCountdown(alert.remainingS ?? 0))}
          />
        );
      } else if (alert.advisory === "GLUCOSE") {
        announce = t.entry.glucose;
        slot = <AlertSlot variant="advisory" title={t.entry.glucose} />;
      } else {
        announce =
          alert.advisory === "UNASSESSABLE"
            ? t.entry.unassessableTitle
            : t.alertSlot.unavailable;
        slot = (
          <AlertSlot
            variant="advisory"
            icon="clipboard"
            title={
              alert.advisory === "UNASSESSABLE"
                ? t.entry.unassessableTitle
                : t.alertSlot.unavailable
            }
            right={
              <Button
                variant="advisory"
                size="none"
                className="h-10 px-5 text-md"
                onClick={openAssessment}
              >
                <ClipboardList aria-hidden size={18} strokeWidth={1.75} />
                {t.alertSlot.perform}
              </Button>
            }
          />
        );
      }
      break;
    default:
      slot = <AlertSlot variant="empty" title={t.alertSlot.noAlerts} />;
  }

  return (
    <div className="px-8 compact:px-4">
      {slot}
      <p aria-live="assertive" className="sr-only">
        {announce}
      </p>
    </div>
  );
}
