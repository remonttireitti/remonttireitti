import { AutomationPanel } from "@/components/automation-panel";

type Props = {
  searchParams: Promise<{
    trigger_device?: string;
    trigger_press?: string;
    trigger_button?: string;
    trigger_action?: string;
  }>;
};

export default async function AutomaatioPage({ searchParams }: Props) {
  const params = await searchParams;
  const press =
    params.trigger_press === "long" || params.trigger_press === "double"
      ? params.trigger_press
      : params.trigger_press === "short"
        ? "short"
        : undefined;

  return (
    <AutomationPanel
      initialTriggerDevice={params.trigger_device}
      initialTriggerPress={press}
      initialTriggerButton={params.trigger_button}
      initialTriggerAction={params.trigger_action}
    />
  );
}
