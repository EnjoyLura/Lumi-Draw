import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { FeedQueryDto, PlazaQueryDto, SearchQueryDto } from "./works.query";
import { CreateWorkDto, DeleteWorkQueryDto, MyGalleryQueryDto, UpdateWorkDto } from "./works.write.dto";
import { WorksService } from "./works.service";

@ApiTags("works")
@Controller("works")
export class WorksController {
  constructor(private readonly works: WorksService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get("feed")
  feed(@CurrentUser() user: { id: number } | undefined, @Query() query: FeedQueryDto) {
    return this.works.feed(query.tab, query.page, query.pageSize, user?.id);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get("plaza")
  plaza(@CurrentUser() user: { id: number } | undefined, @Query() query: PlazaQueryDto) {
    return this.works.plaza(
      {
        categoryId: query.categoryId,
        categoryIds: query.categoryIds,
        modelIds: query.modelIds,
        ratios: query.ratios,
        qualities: query.qualities
      },
      query.sort,
      query.page,
      query.pageSize,
      user?.id
    );
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get("search")
  search(@CurrentUser() user: { id: number } | undefined, @Query() query: SearchQueryDto) {
    return this.works.search(query.keyword, query.page, query.pageSize, user?.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me/gallery")
  myGallery(@CurrentUser() user: { id: number }, @Query() query: MyGalleryQueryDto) {
    return this.works.myGallery(user.id, query.status, query.page, query.pageSize);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("me/drafts")
  myDrafts(@CurrentUser() user: { id: number }, @Query() query: MyGalleryQueryDto) {
    return this.works.myGallery(user.id, "draft", query.page, query.pageSize);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  publish(@CurrentUser() user: { id: number }, @Body() dto: CreateWorkDto) {
    return this.works.publish(user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  update(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number, @Body() dto: UpdateWorkDto) {
    return this.works.update(user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  remove(@CurrentUser() user: { id: number }, @Param("id", ParseIntPipe) id: number, @Query() query: DeleteWorkQueryDto) {
    return this.works.remove(user.id, id, query.action);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":id")
  detail(@Param("id", ParseIntPipe) id: number, @CurrentUser() user?: { id: number }) {
    return this.works.detail(id, user?.id);
  }
}
