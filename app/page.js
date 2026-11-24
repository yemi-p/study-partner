import App from "./App";
import { getOutline } from "../lib/content";

export default function Page() {
  return <App outline={getOutline()} />;
}
