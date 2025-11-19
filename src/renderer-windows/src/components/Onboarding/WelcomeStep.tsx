import gdprlogoblue from "../../assets/gdpr-logo-blue.svg";
import gdprlogowhite from "../../assets/gdpr-logo-white.svg";

export function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <img
        src={gdprlogoblue}
        alt="GDPR Logo"
        className="h-32 mx-auto dark:hidden"
      />
      <img
        src={gdprlogowhite}
        alt="GDPR Logo"
        className="h-32 mx-auto hidden dark:block"
      />
      <p className="text-md text-muted-foreground max-w-md mx-auto leading-relaxed">
        To categorize your activity, we periodically take screenshots of your
        active window and use OCR to extract text. The screenshot is deleted
        immediately. The extracted text is processed to analyze your activity.
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
