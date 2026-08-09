import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema } from "@zeminex/shared";
import type { ContactBody } from "@zeminex/shared";
import toast from "react-hot-toast";
import { Mail, Phone, MapPin, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, Breadcrumb } from "@/components/shared";
import { submitContact } from "@/lib/cms";
import { useSiteConfig } from "@/hooks/useSiteConfig";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";

export function ContactPage() {
  const { data: config } = useSiteConfig();
  const [submitting, setSubmitting] = useState(false);

  useDocumentMeta({ title: "Contact — Zeminex Global", description: "Get in touch with the Zeminex Global team." });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactBody>({ resolver: zodResolver(contactSchema.shape.body) });

  const onSubmit = async (values: ContactBody) => {
    setSubmitting(true);
    try {
      await submitContact(values);
      toast.success("Message sent! We'll get back to you soon.");
      reset();
    } catch {
      // Toast handled by the axios interceptor.
    } finally {
      setSubmitting(false);
    }
  };

  const cd = config?.contactDetails ?? {};

  return (
    <div className="container py-10 sm:py-12">
      <div className="mb-8">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Contact" }]} />
        <PageHeader title="Contact us" description="Questions, feedback, or partnership ideas — we'd love to hear from you." />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Contact details */}
        <div className="space-y-6">
          {cd.email && (
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Email</p>
                <a href={`mailto:${cd.email}`} className="break-all text-sm text-muted-foreground hover:text-foreground">{cd.email}</a>
              </div>
            </div>
          )}
          {cd.phone && (
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Phone</p>
                <p className="break-all text-sm text-muted-foreground">{cd.phone}</p>
              </div>
            </div>
          )}
          {cd.address && (
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-medium">Address</p>
                <p className="break-words text-sm text-muted-foreground">{cd.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" {...register("name")} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input id="subject" placeholder="What's this about?" {...register("subject")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Tell us how we can help…"
                  {...register("message")}
                  className="glass-input w-full px-3 py-2 text-sm placeholder:text-muted-foreground/60 disabled:opacity-50"
                />
                {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : (<><Send className="size-4" /> Send message</>)}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}