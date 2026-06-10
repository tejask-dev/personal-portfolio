'use client';
import { FormEvent, useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Instagram, Linkedin, Mail } from 'lucide-react';
import { profile } from '@/data/profile';
import ScrollTextReveal from './ScrollTextReveal';

export default function ContactSection() {
  const [status, setStatus] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const message = String(data.get('message') || '').trim();

    if (!name || !email || !message) {
      setStatus('Please complete all fields before sending.');
      return;
    }

    const subject = encodeURIComponent(`Portfolio inquiry from ${name}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name}\nEmail: ${email}`);
    window.location.href = `mailto:${profile.email}?subject=${subject}&body=${body}`;
    setStatus('Opening your email app with the message ready to send.');
  };

  return (
    <section id="contact" className="section-shell">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div>
          <p className="eyebrow">Contact</p>
          <ScrollTextReveal text="Let's build something ambitious." className="section-title max-w-3xl" />
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#ede9fe]">
            For collaborations, startups, internships, speaking, research, or client projects.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={`mailto:${profile.email}`} className="icon-button" aria-label="Email Tejass">
              <Mail className="h-4 w-4" />
            </a>
            <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label="LinkedIn">
              <Linkedin className="h-4 w-4" />
            </a>
            <a href={profile.socials.github} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label="GitHub">
              <Github className="h-4 w-4" />
            </a>
            <a href={profile.socials.instagram} target="_blank" rel="noopener noreferrer" className="icon-button" aria-label="Instagram">
              <Instagram className="h-4 w-4" />
            </a>
          </div>
        </div>

        <motion.form
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit}
          className="rounded-[2rem] border border-[#f8fbff]/10 bg-[#16091f]/78 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-7"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[#ddd6fe]">
              Name
              <input name="name" className="rounded-2xl border border-[#f8fbff]/12 bg-[#070312]/70 px-4 py-3 text-[#f8fbff] outline-none focus:border-[#c084fc] focus:ring-2 focus:ring-[#a855f7]/25" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[#ddd6fe]">
              Email
              <input name="email" type="email" className="rounded-2xl border border-[#f8fbff]/12 bg-[#070312]/70 px-4 py-3 text-[#f8fbff] outline-none focus:border-[#c084fc] focus:ring-2 focus:ring-[#a855f7]/25" />
            </label>
          </div>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-[#ddd6fe]">
            Message
            <textarea name="message" rows={6} className="resize-none rounded-2xl border border-[#f8fbff]/12 bg-[#070312]/70 px-4 py-3 text-[#f8fbff] outline-none focus:border-[#c084fc] focus:ring-2 focus:ring-[#a855f7]/25" />
          </label>
          <button type="submit" className="mt-5 w-full rounded-full bg-[#a855f7] px-6 py-3 text-sm font-bold text-[#070312] transition hover:bg-[#c084fc] focus:outline-none focus:ring-2 focus:ring-[#c084fc]">
            Send Message
          </button>
          {status && <p className="mt-4 text-sm text-[#ddd6fe]" role="status">{status}</p>}
        </motion.form>
      </div>
    </section>
  );
}
