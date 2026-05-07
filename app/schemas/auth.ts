import z from "zod";

export const signUpSchema = z.object({
    name: z.string().min(3).max(30),
    email: z.email(),
    password: z.string().min(8).max(30),
    // Optional — only required when "I'm signing up as staff" is checked,
    // which the page enforces at submit time.
    inviteCode: z.string().optional(),
});

export const loginSchema=z.object({
    email:z.email(),
    password:z.string().min(8).max(30),
})