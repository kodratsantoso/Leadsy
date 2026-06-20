import { cn } from "@/lib/utils";

interface AILoaderProps {
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

export const AILoader = ({ className, text = "Generating", fullScreen = false }: AILoaderProps) => {
  const content = (
    <div className={cn("loader-wrapper", className)}>
      {text.split('').map((char, index) => (
        <span 
          key={index} 
          className="loader-letter" 
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
      <div className="loader"></div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};
