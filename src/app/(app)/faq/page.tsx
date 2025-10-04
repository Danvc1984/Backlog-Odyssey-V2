
'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqItems = [
    {
        question: "How do I add games to my library?",
        answer: "You can add games in three ways: manually one by one, using the 'Batch Add' feature to search for multiple games at once, or by importing your library directly from your Steam account via the 'My Profile' page."
    },
    {
        question: "How do AI recommendations work?",
        answer: "Our AI analyzes your entire game library, including what you're playing now, what's in your backlog, and your personal ratings. Simply describe your gaming mood in the 'Get AI Recommendations' panel, and it will suggest games tailored to you."
    },
    {
        question: "How are game discounts found?",
        answer: "When you log in, the app automatically checks for Steam discounts on PC games in your 'Wishlist'. If any deals are found, a badge will appear on the game card, showing you the discount percentage."
    },
    {
        question: "What is Steam Deck compatibility?",
        answer: "If you indicate that you play on a Steam Deck in your profile, the app will fetch and display compatibility ratings (from ProtonDB) for your PC games. This helps you know how well a game will run on your Steam Deck."
    },
     {
        question: "How can I update my platform preferences or Steam ID?",
        answer: "You can update your owned platforms, set a favorite platform, and manage your Steam ID on the 'My Profile' page. This is also where you can initiate a Steam library import."
    }
]

export default function FAQPage() {
  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Frequently Asked Questions</h2>
        <p className="text-muted-foreground">Find answers to common questions about the app's features.</p>
      </div>
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, index) => (
            <AccordionItem value={`item-${index + 1}`} key={index}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>
                    {item.answer}
                </AccordionContent>
            </AccordionItem>
        ))}
        </Accordion>
    </div>
  );
}
