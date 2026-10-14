"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { FolderTab } from "@/components/ui/folder-tab";
import { Highlight } from "@/components/ui/highlight";
import { Paper } from "@/components/ui/paper";
import { Stamp } from "@/components/ui/stamp";
import {
  demoBulletCount,
  demoListings,
  demoProfile,
  splitByPhrases,
  tailorRoles,
  type DemoListing,
  type TextSegment,
} from "./demo-data";

interface TimedSegment extends TextSegment {
  delay: number;
}

// Strokes draw in reading order: the listing first, then down the page.
function layoutDemo(listing: DemoListing) {
  let step = 0;
  const nextDelay = () => 250 + step++ * 110;
  const mark = (text: string, phrases: string[]): TimedSegment[] =>
    splitByPhrases(text, phrases).map((segment) => ({
      ...segment,
      delay: segment.marked ? nextDelay() : 0,
    }));
  return {
    body: mark(listing.body, listing.phrases),
    summary: mark(listing.summary, listing.matched),
    roles: tailorRoles(listing).map((role) => ({
      ...role,
      bullets: role.bullets.map((bullet) => ({
        id: bullet.id,
        segments: mark(bullet.text, listing.matched),
      })),
    })),
    skills: listing.skills.map((skill) => mark(skill, listing.matched)),
    // The stamp lands once the last stroke has been drawn.
    stampDelay: nextDelay() + 450,
  };
}

function Marked({ segments }: { segments: TimedSegment[] }) {
  return segments.map((segment, index) =>
    segment.marked ? (
      <Highlight
        key={index}
        className="highlight-draw"
        // The stroke's start time is per mark, so it cannot be a utility class.
        style={
          { "--highlight-delay": `${segment.delay}ms` } as React.CSSProperties
        }
      >
        {segment.text}
      </Highlight>
    ) : (
      segment.text
    ),
  );
}

function PageSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-[0.9em] flex flex-col gap-[0.35em]">
      {/* Uppercase with a heavy rule, as the compiled template sets them. */}
      <p className="border-b-[1.5px] border-current pb-[0.1em] font-bold uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}

function EntryHeading({ heading, dates }: { heading: string; dates: string }) {
  return (
    <p className="flex justify-between gap-[1em] font-bold">
      <span>{heading}</span>
      <span className="whitespace-nowrap">{dates}</span>
    </p>
  );
}

export function ResumeDemo() {
  const [firstListing] = demoListings;
  const [listingId, setListingId] = useState(firstListing?.id);
  const listing =
    demoListings.find((item) => item.id === listingId) ?? firstListing;
  if (!listing) return null;

  const layout = layoutDemo(listing);

  return (
    <div className="flex min-w-0 flex-col">
      {/* On wide screens the tabs rise into the strip above the hero, one
          pixel short of its edge so only the open tab reaches over it. */}
      <div
        role="group"
        aria-label="Example job listings"
        className="border-kraft flex items-end border-b max-lg:pt-2 lg:-mt-[calc(2.5rem+1px)] lg:border-b-0"
      >
        {demoListings.map((item) => (
          <FolderTab
            key={item.id}
            asChild
            open={item.id === listing.id}
            className="-ml-1 px-4 first:ml-0 sm:px-5"
          >
            <button
              type="button"
              aria-pressed={item.id === listing.id}
              aria-label={`${item.title} at ${item.company}`}
              onClick={() => setListingId(item.id)}
            >
              {item.company}
            </button>
          </FolderTab>
        ))}
      </div>

      {/* Re-keyed per listing so the strokes draw again after a switch. */}
      <div
        key={listing.id}
        className="grid items-start gap-6 pt-8 md:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:pt-10"
      >
        <div className="flex flex-col gap-4">
          <Card layout="flush" className="flex flex-col gap-3 p-5">
            <div>
              <p className="font-semibold">{listing.title}</p>
              <p className="text-muted-foreground text-sm">{listing.company}</p>
            </div>
            <p className="text-sm leading-relaxed">
              <Marked segments={layout.body} />
            </p>
          </Card>
          <ul className="text-muted-foreground flex flex-col gap-1 px-1 text-sm">
            <li>
              <span className="text-foreground font-semibold tabular-nums">
                {listing.bulletIds.length} of {demoBulletCount}
              </span>{" "}
              bullets kept
            </li>
            <li>
              <span className="text-foreground font-semibold tabular-nums">
                {listing.skills.length} of {demoProfile.skills.length}
              </span>{" "}
              skills listed, most relevant first
            </li>
          </ul>
        </div>

        <figure className="flex flex-col gap-3">
          <Paper className="@container relative aspect-[210/297] w-full">
            <Stamp
              frame="double"
              pressed
              className="text-success absolute top-[4cqw] right-[4cqw] text-[max(11px,3.4cqw)] [--stamp-tilt:7deg]"
              style={
                { "--stamp-delay": `${layout.stampDelay}ms` } as React.CSSProperties
              }
            >
              Fits 1 page
            </Stamp>
            <div className="px-[7cqw] py-[6cqw] text-[max(10px,2.75cqw)] leading-[1.32]">
              <div className="text-center">
                <p className="text-[1.33em] font-bold">{demoProfile.name}</p>
                {demoProfile.contactLines.map((line) => (
                  <p
                    key={line.join()}
                    className="flex flex-wrap justify-center gap-x-[1em]"
                  >
                    {line.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </p>
                ))}
              </div>

              <PageSection title="Professional Summary">
                <p>
                  <Marked segments={layout.summary} />
                </p>
              </PageSection>

              <PageSection title="Work Experiences">
                {layout.roles.map((role) => (
                  <div key={role.id}>
                    <EntryHeading heading={role.heading} dates={role.dates} />
                    <ul className="list-disc pl-[2.2em]">
                      {role.bullets.map((bullet) => (
                        <li key={bullet.id}>
                          <Marked segments={bullet.segments} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </PageSection>

              <PageSection title="Education">
                <div>
                  <EntryHeading
                    heading={demoProfile.education.heading}
                    dates={demoProfile.education.dates}
                  />
                  <p>{demoProfile.education.subheading}</p>
                </div>
              </PageSection>

              <PageSection title="Skills">
                <div>
                  <p className="font-bold">Technical</p>
                  <p>
                    {layout.skills.map((segments, index) => (
                      <span key={listing.skills[index]}>
                        {index > 0 && ", "}
                        <Marked segments={segments} />
                      </span>
                    ))}
                  </p>
                </div>
              </PageSection>
            </div>
          </Paper>
          <figcaption className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
            <dl className="flex gap-x-6 tabular-nums">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Pages</dt>
                <dd className="font-semibold">1</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Target</dt>
                <dd className="font-semibold">1</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Revisions</dt>
                <dd className="font-semibold">{listing.revisions}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground">
              Example profile. The app compiles this page as a PDF.
            </p>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
