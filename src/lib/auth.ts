import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    async signIn({ profile }) {
      // Only allow your GitHub account
      return profile?.login === "seantokuzo";
    },
  },
  pages: {
    signIn: "/login",
  },
});
