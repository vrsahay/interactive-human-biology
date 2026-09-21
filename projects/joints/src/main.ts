performance.mark("joints:main-eval");
import { h, render } from "preact";
import "./styles.css";
import "./ui/video/film.css";
import { FilmShell } from "./ui/video/FilmShell";

const params = new URLSearchParams(location.search);
const qa = params.get("qa") === "1";
const dpr = params.get("dpr");
const props = { qa, fixedPixelRatio: dpr ? Number(dpr) : undefined };

// The video-first lesson is the default route; the Step-10 interactive sandbox stays at ?mode=sandbox.
const root = document.getElementById("app")!;
if (params.get("mode") === "sandbox") {
  document.body.dataset.mode = "sandbox";
  // The Step-10 sandbox is not part of the film's startup bundle.
  void import("./ui/Shell").then(({ Shell }) => render(h(Shell, props), root));
} else {
  document.body.dataset.mode = "film";
  document.title = "Types of Joints";
  render(h(FilmShell, props), root);
  performance.mark("joints:shell-rendered");
}
