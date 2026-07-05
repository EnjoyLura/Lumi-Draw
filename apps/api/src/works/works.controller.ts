import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { FeedQueryDto, PlazaQueryDto, SearchQueryDto } from "./works.query";
import { WorksService } from "./works.service";

@ApiTags("works")
@Controller("works")
export class WorksController {
  constructor(private readonly works: WorksService) {}

  @Get("feed")
  feed(@Query() query: FeedQueryDto) {
    return this.works.feed(query.tab, query.page, query.pageSize);
  }

  @Get("plaza")
  plaza(@Query() query: PlazaQueryDto) {
    return this.works.plaza(query.categoryId, query.sort, query.page, query.pageSize);
  }

  @Get("search")
  search(@Query() query: SearchQueryDto) {
    return this.works.search(query.keyword, query.page, query.pageSize);
  }

  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number) {
    return this.works.detail(id);
  }
}
