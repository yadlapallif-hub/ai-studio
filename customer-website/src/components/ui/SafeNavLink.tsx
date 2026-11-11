"use client";

import React from "react";
import { useRouter } from "next/navigation";

export interface SafeNavLinkProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "href"> {
  href: string;
  target?: string;
  rel?: string;
  external?: boolean;
  replace?: boolean;
  scroll?: boolean;
  children: React.ReactNode;
}

export function SafeNavLink({
  href,
  target,
  external,
  replace,
  scroll,
  onClick,
  className = "",
  style,
  children,
  ...rest
}: SafeNavLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;

    if (href.startsWith("mailto:") || href.startsWith("tel:")) {
      window.location.href = href;
      return;
    }

    const isExternal =
      Boolean(external) ||
      target === "_blank" ||
      /^https?:\/\//i.test(href) ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey;

    if (isExternal) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (replace) {
      router.replace(href, { scroll });
    } else {
      router.push(href, { scroll });
    }
  };

  return (
    <button
      type="button"
      role="link"
      onClick={handleClick}
      style={{ textAlign: "inherit", ...style }}
      className={`cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
