export function PostHogOptInEuStep() {
  return (
    <div className="text-center space-y-6">
      <p className="text-md text-muted-foreground max-w-md mx-auto leading-relaxed">
        We use PostHog to track usage (e.g., clicks, views) to improve CronusHQ.
        You can choose whether to enable this optional analytics tracking.
      </p>
      <p className="text-sm text-muted-foreground">
        For more details, please read our{" "}
        <a
          href="https://cronushq.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
