export interface PartOption {
  label: string;
  value: string;
  href: string;
}

export interface BreadcrumbItem {
  label: string;
  href: string;
  isActive?: boolean;
  partOptions?: PartOption[];
}
