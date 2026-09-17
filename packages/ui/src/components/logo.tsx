import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

type LogoProps = React.ImgHTMLAttributes<HTMLImageElement> & {
	surface?: "chip" | "plain";
};

const Logo = ({ surface = "chip", className, style, ...props }: LogoProps) =>
	surface === "plain" ? (
		<img
			src="/mynaani-mark.webp"
			alt="Mynaani"
			className={className}
			style={style}
			{...props}
		/>
	) : (
		<span
			className={cn(
				"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-2xs",
				className,
			)}
			style={style}
		>
			<img
				src="/mynaani-mark.webp"
				alt="Mynaani"
				className="size-full object-contain"
				{...props}
			/>
		</span>
	);
export default Logo;
