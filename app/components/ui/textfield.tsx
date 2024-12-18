"use client";

import {
  Input as AriaInput,
  type InputProps as AriaInputProps,
  TextArea as AriaTextArea,
  type TextAreaProps as AriaTextAreaProps,
  TextField as AriaTextField,
  type TextFieldProps as AriaTextFieldProps,
  type ValidationResult as AriaValidationResult,
  composeRenderProps,
  Text,
} from "react-aria-components";
import { cn } from "~/lib/utils";
import { FieldError, Label } from "./field";

const TextField = AriaTextField;

interface InputProps extends AriaInputProps, React.RefAttributes<HTMLInputElement> {}
const Input = ({ className, ...props }: InputProps) => {
  return (
    <AriaInput
      className={composeRenderProps(className, (className) =>
        cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground",
          /* Disabled */
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          /* Focused */
          "data-[focused]:outline-none data-[focused]:ring-1 data-[focused]:ring-ring",
          /* Resets */
          "focus-visible:outline-none",
          className,
        ),
      )}
      {...props}
    />
  );
};

const TextArea = ({ className, ...props }: AriaTextAreaProps) => {
  return (
    <AriaTextArea
      className={composeRenderProps(className, (className) =>
        cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground",
          /* Focused */
          "data-[focused]:outline-none data-[focused]:ring-2 data-[focused]:ring-ring data-[focused]:ring-offset-2",
          /* Disabled */
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          /* Resets */
          "focus-visible:outline-none",
          className,
        ),
      )}
      {...props}
    />
  );
};

interface JollyTextFieldProps extends AriaTextFieldProps {
  label?: React.ReactNode;
  description?: React.ReactNode;
  errorMessage?: React.ReactNode | ((validation: AriaValidationResult) => React.ReactNode);
  textArea?: boolean;
  children?: React.ReactNode;
}

function JollyTextField({
  label,
  description,
  errorMessage,
  textArea,
  className,
  children,
  ...props
}: JollyTextFieldProps) {
  return (
    <TextField
      className={composeRenderProps(className, (className) =>
        cn("group flex flex-col gap-2", className),
      )}
      {...props}
    >
      <Label>{label}</Label>
      {children ? children : textArea ? <TextArea /> : <Input />}
      {description && (
        <Text className="text-sm text-muted-foreground" slot="description">
          {description}
        </Text>
      )}
      <FieldError>{errorMessage}</FieldError>
    </TextField>
  );
}

export { Input, TextField, JollyTextField, TextArea };
