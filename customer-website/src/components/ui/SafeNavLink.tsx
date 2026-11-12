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
  onMouseEnter,
  onFocus,
  className = "",
  style,
  children,
  ...rest
}: SafeNavLinkProps) {
  const router = useRouter();

  const isInternalRoute =
    Boolean(href) &&
    !external &&
    target !== "_blank" &&
    !href.startsWith("mailto:") &&
    !href.startsWith("tel:") &&
    !/^https?:\/\//i.test(href);

  const handlePrefetch = () => {
    if (isInternalRoute && typeof router.prefetch === "function") {
      try {
        router.prefetch(href);
      } catch {
        // ignore prefetch failures
      }
    }
  };

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

    window.dispatchEvent(new CustomEvent("fcs:nav-start", { detail: { href } }));

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
      onMouseEnter={(e) => {
        handlePrefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        handlePrefetch();
        onFocus?.(e);
      }}
      style={{ textAlign: "inherit", ...style }}
      className={`cursor-pointer ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
