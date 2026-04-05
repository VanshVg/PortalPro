// ============================================
// @portalpro/ui — Shared React Component Library
// ============================================

// Utilities
export { cn } from "./lib/utils";

// Base Components
export { Button, type ButtonProps } from "./components/Button";
export { Input, type InputProps } from "./components/Input";
export { PasswordInput, type PasswordInputProps } from "./components/PasswordInput";
export { Textarea, type TextareaProps } from "./components/Textarea";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./components/Select";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./components/Card";
export { Badge, type BadgeProps } from "./components/Badge";
export { Avatar, AvatarImage, AvatarFallback } from "./components/Avatar";
export { Skeleton } from "./components/Skeleton";

// Status Components
export {
  StatusBadge,
  type StatusBadgeProps,
  ProjectStatusBadge,
  TaskStatusBadge,
  InvoiceStatusBadge,
} from "./components/StatusBadge";

// Overlay Components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/Dialog";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./components/DropdownMenu";
export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./components/Toast";

// Navigation Components
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/Tabs";
export { Breadcrumbs, type BreadcrumbsProps, type BreadcrumbItem } from "./components/Breadcrumbs";

// Data Display
export { DataTable, type Column, type DataTableProps } from "./components/DataTable";
export { EmptyState, type EmptyStateProps } from "./components/EmptyState";

// Hooks
export { useToast, type ToastOptions, type ToastState } from "./hooks/use-toast";
