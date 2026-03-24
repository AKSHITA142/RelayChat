import { useLayoutEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsapScrollReveal({ scopeRef, scrollerRef, selector = "[data-reveal]", deps = [] }) {
  useLayoutEffect(() => {
    if (!scopeRef.current) return undefined;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray(selector);

      targets.forEach((target, index) => {
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 24 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.55,
            delay: index * 0.04,
            ease: "power2.out",
            scrollTrigger: {
              trigger: target,
              scroller: scrollerRef?.current || undefined,
              start: "top 88%",
              once: true,
            },
          }
        );
      });
    }, scopeRef);

    return () => ctx.revert();
  }, deps);
}
