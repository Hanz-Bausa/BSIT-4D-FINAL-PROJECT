# BSIT-4D-FINAL-PROJECT
Microservices Student Portal Final Project - BSIT 4B

---

## PROJECT WORKFLOW
To avoid conflicts and broken code, follow these rules **STRICTLY**:

---

### **1. ALWAYS PULL BEFORE YOU DO ANYTHING**
Before editing, adding, or deleting any file, run:
"git pull origin main"
This prevents conflicts and ensures your copy is up to date.  
If you skip this, your push may fail and you may overwrite other groups' work.

---

### 2. WORK ONLY INSIDE YOUR GROUP’S FOLDER
Each group has its own microservice:

| Group | Microservice             | Folder Name              |
|-------|---------------------------|---------------------------|
| Group 1 | Authentication Service | Authentication-Services   |
| Group 2 | Student Service        | Student-Services          |
| Group 3 | Enrollment Service     | Enrollment-Services       |
| Group 4 | Grade Service          | Grade-Services            |
| Group 5 | Notification Service   | Notification-Services     |

❗ DO NOT edit files inside another group's folder.

Each group is responsible for their own microservice only.  
If you touch another group's code without permission = automatic conflict & error.

---

### **3. HOW TO ADD & PUSH YOUR WORK**

After finishing your changes **inside your assigned folder**:

**Step 1 – Check Changes**
git status

If there are changes, **pull first** before continuing.

**Step 2 – Add your changes**
git add .

**Step 3 – Commit**
git commit -m "Your update message"
(It is advisable to include the date in your message.)

**Step 4 – Push**
git push origin main

---

### **4. IF YOU SEE AN ERROR WHEN PUSHING**
It means someone pushed while you were working.

Fix it by running:
git pull origin main

Resolve any conflict (if needed), then push again.

---

### **5. DO NOT DO THE FOLLOWING**
To avoid breaking the whole repository:

- ❌ Don’t rename other groups’ folders  
- ❌ Don’t move files outside your microservice folder  
- ❌ Don’t delete files you did not create  
- ❌ Don’t push directly to the root unless instructed  
- ❌ Don’t edit the README unless approved  
- ❌ Don’t run `git add .` inside another group’s folder  

---

### **6. Communication Reminder**
- Inform your group members before making big changes  
- Inform the instructor if needed  
- Commit only when your code runs successfully  
