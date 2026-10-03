"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ExpandableListContextValue {
	expandedId: string | null;
	setExpandedId: (id: string | null) => void;
}

const ExpandableListContext = React.createContext<ExpandableListContextValue | null>(null);

function useExpandableList() {
	const context = React.useContext(ExpandableListContext);
	if (!context) {
		throw new Error("useExpandableList must be used within an ExpandableList");
	}
	return context;
}

interface ExpandableListProps {
	children: React.ReactNode;
	className?: string;
}

function ExpandableList({ children, className }: ExpandableListProps) {
	const [expandedId, setExpandedId] = React.useState<string | null>(null);

	return (
		<ExpandableListContext.Provider value={{ expandedId, setExpandedId }}>
			<div className={cn("divide-y divide-border", className)}>
				{children}
			</div>
		</ExpandableListContext.Provider>
	);
}

interface ExpandableListItemProps {
	id: string;
	children: React.ReactNode;
	className?: string;
}

function ExpandableListItem({ id, children, className }: ExpandableListItemProps) {
	const { expandedId, setExpandedId } = useExpandableList();
	const isExpanded = expandedId === id;

	const handleToggle = () => {
		setExpandedId(isExpanded ? null : id);
	};

	return (
		<div
			className={cn(
				"transition-all duration-200",
				isExpanded && "border-l-2 border-primary bg-muted/30",
				className
			)}
		>
			{React.Children.map(children, (child) => {
				if (React.isValidElement(child)) {
					if (child.type === ExpandableListItemHeader) {
						return React.cloneElement(child as React.ReactElement<ExpandableListItemHeaderProps>, {
							onClick: handleToggle,
							isExpanded,
						});
					}
					if (child.type === ExpandableListItemContent) {
						return isExpanded ? child : null;
					}
				}
				return child;
			})}
		</div>
	);
}

interface ExpandableListItemHeaderProps {
	children: React.ReactNode;
	className?: string;
	onClick?: () => void;
	isExpanded?: boolean;
}

function ExpandableListItemHeader({
	children,
	className,
	onClick,
}: ExpandableListItemHeaderProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center min-h-16 px-4 py-3 text-left transition-colors hover:bg-muted/50",
				className
			)}
		>
			{children}
		</button>
	);
}

interface ExpandableListItemContentProps {
	children: React.ReactNode;
	className?: string;
}

function ExpandableListItemContent({
	children,
	className,
}: ExpandableListItemContentProps) {
	return (
		<div
			className={cn(
				"px-4 pb-4 pt-2 animate-in slide-in-from-top-2 duration-200",
				className
			)}
		>
			{children}
		</div>
	);
}

export {
	ExpandableList,
	ExpandableListItem,
	ExpandableListItemHeader,
	ExpandableListItemContent,
	useExpandableList,
};
