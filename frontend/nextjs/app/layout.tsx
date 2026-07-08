// @ts-nocheck
import type React from "react"
import type { Metadata } from "next"
import { Nunito } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { CartProvider } from "@/context/cart-context"
import { AuthProvider } from "@/context/auth-context"
import { NotificationsProvider } from "@/context/notifications-context"
import { ProductsProvider } from "@/context/products-context"
import { OrdersProvider } from "@/context/orders-context"
import { ReviewsProvider } from "@/context/reviews-context"
import { QRProvider } from "@/context/qr-context"
import { ProfileProvider } from "@/context/profile-context"
import { SalesProvider } from "@/context/sales-context"
import { ToastProvider } from "@/context/toast-context"


export const metadata: Metadata = {
  title: "E-artisan",
  description: "Decouvrir les créations uniques ",
  icons: {
    icon: "/favicon.ico",
  },
}

const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const BIS_ATTRS = ['bis_skin_checked', 'bis_use', 'bis_server', 'bis_fragment', 'data-bis-config', 'data-bis-content', 'data-dynamic-id', '__processed_51900a7a-c7b0-44eb-97ef-dc7e1e015454__']

  return (
      <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <head suppressHydrationWarning>
        <script suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var a=${JSON.stringify(BIS_ATTRS)};
                function c(){document.querySelectorAll('*').forEach(function(e){
                  for(var i=0;i<a.length;i++){if(e.hasAttribute(a[i])){e.removeAttribute(a[i])}}
                  if(e.tagName==='SCRIPT'&&e.getAttribute('src')&&e.getAttribute('src').indexOf('chrome-extension')>-1){e.remove()}
                })}
                c();
                var o=new MutationObserver(function(){c()});
                o.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:a});
                document.addEventListener('DOMContentLoaded',c);
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased font-sans" suppressHydrationWarning>
        <AuthProvider>
          <NotificationsProvider>
            <ProductsProvider>
              <OrdersProvider>
                <ReviewsProvider>
                  <QRProvider>
                    <ProfileProvider>
                      <SalesProvider>
                        <CartProvider>
                          <ToastProvider>
                            {children}
                          </ToastProvider>
                        </CartProvider>
                      </SalesProvider>
                    </ProfileProvider>
                  </QRProvider>
                </ReviewsProvider>
              </OrdersProvider>
            </ProductsProvider>
          </NotificationsProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}

