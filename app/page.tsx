"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(user.role === "manager" ? "/dashboard/manager" : "/dashboard/developer");
    } else {
      router.replace("/login");
    }
  }, [user, router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );
}
