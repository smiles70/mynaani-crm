import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { CrmModule } from "../crm/crm.module";
import { RetellController } from "./retell.controller";
import { RetellService } from "./retell.service";

@Module({
	imports: [AgentModule, CrmModule],
	controllers: [RetellController],
	providers: [RetellService],
})
export class RetellModule {}
