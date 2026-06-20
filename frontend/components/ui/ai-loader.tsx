import { cn } from "@/lib/utils";

interface AILoaderProps {
  className?: string;
  text?: string;
}

export const AILoader = ({ className, text = "Generating" }: AILoaderProps) => {
  return (
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
};
