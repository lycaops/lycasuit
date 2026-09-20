"use client"

import { useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Loader from "@/components/Loader"
import { UserFormFields } from "./user-form-fields"
import { createUserAction } from "@/app/tools/contracts/users/actions"
import type { Role } from "@/lib/branches"

const initial = {
  full_name: "",
  email: "",
  password: "",
  role: "FSE" as Role,
  branch: null as string | null,
  branches: null as string[] | null,
  zone: null as string | null,
}

export function NewUserDialog() {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState(initial)
  const [pending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      if (values.role === "RSM" && (!values.branches || values.branches.length === 0)) {
        toast.error("Select at least one branch for RSM.")
        return
      }
      const res = await createUserAction({
        email: values.email,
        password: values.password ?? "",
        full_name: values.full_name,
        role: values.role,
        branch: values.branch,
        branches: values.branches,
        zone: values.zone,
      })
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      toast.success("User created")
      setValues(initial)
      setOpen(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
          Add user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create a new staff account and assign a role and territory.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit}>
          <UserFormFields
            values={values}
            onChange={(p) => setValues((v) => ({ ...v, ...p }))}
            includePassword
          />
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader size={18} weight={26} inherit label="Creating user" /> : null}
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
