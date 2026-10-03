"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  ExpandableList,
  ExpandableListItem,
  ExpandableListItemHeader,
  ExpandableListItemContent,
} from "@/components/ui/expandable-list";

interface ResponsiveListProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  renderMobileHeader: (item: T) => React.ReactNode;
  renderMobileContent: (item: T) => React.ReactNode;
  renderDesktopCard: (item: T) => React.ReactNode;
  mobileClassName?: string;
  desktopClassName?: string;
}

function ResponsiveList<T>({
  items,
  getItemId,
  renderMobileHeader,
  renderMobileContent,
  renderDesktopCard,
  mobileClassName,
  desktopClassName,
}: ResponsiveListProps<T>) {
  return (
    <>
      {/* Mobile: Expandable List */}
      <div className="md:hidden">
        <Card layout="flush" className={cn("overflow-hidden", mobileClassName)}>
          <ExpandableList>
            {items.map((item) => (
              <ExpandableListItem key={getItemId(item)} id={getItemId(item)}>
                <ExpandableListItemHeader>
                  {renderMobileHeader(item)}
                </ExpandableListItemHeader>
                <ExpandableListItemContent>
                  {renderMobileContent(item)}
                </ExpandableListItemContent>
              </ExpandableListItem>
            ))}
          </ExpandableList>
        </Card>
      </div>

      {/* Desktop: Card Grid */}
      <div className={cn("hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-3", desktopClassName)}>
        {items.map((item) => (
          <React.Fragment key={getItemId(item)}>
            {renderDesktopCard(item)}
          </React.Fragment>
        ))}
      </div>
    </>
  );
}

export { ResponsiveList, type ResponsiveListProps };
