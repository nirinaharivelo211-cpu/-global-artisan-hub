import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"

export default function ProductNotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="font-serif text-4xl font-bold text-foreground">Product Not Found</h1>
        <p className="mt-4 text-muted-foreground">Sorry, we couldn&apos;t find the product you&apos;re looking for.</p>
        <Button asChild className="mt-8">
          <Link href="/products">Browse All Products</Link>
        </Button>
      </main>
      <Footer />
    </div>
  )
}
