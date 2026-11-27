import Parent from "./Parent";
export const metadata = { title: "His progress", robots: { index: false }, manifest: "/parent.webmanifest", appleWebApp: { capable: true, title: "His progress" }, icons: { icon: "/parent-192.png", apple: "/parent-192.png" } };
export default function Page() { return <Parent />; }
