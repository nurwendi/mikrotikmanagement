-- CreateTable
CREATE TABLE "Registration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "username" TEXT NOT NULL,
    "targetUsername" TEXT,
    "name" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "agentId" TEXT,
    "password" TEXT,
    "profile" TEXT,
    "service" TEXT,
    "comment" TEXT,
    "routerIds" TEXT,
    "newValues" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);
