import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const themeBootstrapScript = `(function(){try{var k="leadchasers-theme";var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark")t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){document.documentElement.dataset.theme="light"}})()`;

const extensionHydrationGuardScript = `(function(){try{var x={bis_skin_checked:1,bis_register:1,bis_use:1,"data-dynamic-id":1,"data-titans-quick-view-extension-id":1};var m=function(n){return x[n]||/^__processed_[0-9a-f-]+__$/.test(n)};var e=function(r){return r.tagName==="SCRIPT"&&(r.getAttribute("src")||"").indexOf("chrome-extension://")===0};var c=function(r){if(!r||r.nodeType!==1)return;if(e(r)){r.remove();return}var a=r.attributes||[];for(var i=a.length-1;i>=0;i--)if(m(a[i].name))r.removeAttribute(a[i].name);var q=r.querySelectorAll?r.querySelectorAll("*"):[];for(var j=q.length-1;j>=0;j--){if(e(q[j])){q[j].remove();continue}var b=q[j].attributes;for(var k=b.length-1;k>=0;k--)if(m(b[k].name))q[j].removeAttribute(b[k].name)}};var o=new MutationObserver(function(rs){for(var i=0;i<rs.length;i++){var r=rs[i];if(r.type==="attributes"&&m(r.attributeName))r.target.removeAttribute(r.attributeName);else for(var j=0;j<r.addedNodes.length;j++)c(r.addedNodes[j])}});o.observe(document.documentElement,{attributes:true,childList:true,subtree:true});c(document.documentElement);addEventListener("load",function(){setTimeout(function(){o.disconnect()},5000)},{once:true})}catch(e){}})()`;

export const metadata: Metadata = {
  title: { default: "LeadChasers OS", template: "%s · LeadChasers OS" },
  description: "Le centre de commande interne de LeadChasers Media Coop.",
  applicationName: "LeadChasers OS",
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#081711",
  colorScheme: "light dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="fr" data-theme="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: extensionHydrationGuardScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
